import { McpServer } from '@modelcontextprotocol/server';
import * as z from 'zod/v4';

import { generateAndWait, getJobStatus, startGenerationJob } from './presentonClient.js';

const toneEnum = z
  .enum(['default', 'casual', 'professional', 'funny', 'educational', 'sales_pitch'])
  .describe('Writing tone for the slide content');

const verbosityEnum = z
  .enum(['concise', 'standard', 'text-heavy'])
  .describe('How much text to put on each slide');

const generatePresentationSchema = z.object({
  content: z
    .string()
    .min(1)
    .describe('The topic, prompt, or raw content the presentation should be built from'),
  instructions: z
    .string()
    .optional()
    .describe('Extra instructions for the generator (audience, structure, must-include points, etc.)'),
  n_slides: z
    .number()
    .int()
    .min(1)
    .max(50)
    .optional()
    .describe('Number of slides to generate (default 8)'),
  language: z.string().optional().describe('Output language, e.g. "English" or "Hindi" (auto-detected if omitted)'),
  tone: toneEnum.optional(),
  verbosity: verbosityEnum.optional(),
  template: z
    .string()
    .optional()
    .describe('Presenton layout template id to use (default "general")'),
  export_as: z.enum(['pptx', 'pdf']).optional().describe('Export format (default "pptx")'),
  include_title_slide: z.boolean().optional(),
  include_table_of_contents: z.boolean().optional(),
  wait_for_completion: z
    .boolean()
    .optional()
    .describe(
      'If true (default), block and poll until the deck is ready and return the download link. ' +
        'If false, return immediately with a task_id to poll later with check_presentation_status.',
    ),
});

const checkStatusSchema = z.object({
  task_id: z.string().min(1).describe('The task_id returned by generate_presentation'),
});

export function createServer(): McpServer {
  const server = new McpServer({ name: 'presenton-presentation-generator', version: '1.0.0' });

  server.registerTool(
    'generate_presentation',
    {
      description:
        'Generate a downloadable presentation (PPTX or PDF) from a topic or content brief. ' +
        'Runs the same n8n orchestration workflow used by the web frontend, which drives the ' +
        'self-hosted Presenton generation engine end to end (outline -> slides -> layout -> export). ' +
        'By default this call blocks until the deck is ready (typically 30s-3min) and returns a ' +
        'direct download URL.',
      inputSchema: generatePresentationSchema,
    },
    async (input) => {
      const waitForCompletion = input.wait_for_completion !== false;

      try {
        if (!waitForCompletion) {
          const started = await startGenerationJob(input);
          return {
            content: [
              {
                type: 'text',
                text:
                  `Presentation generation started (task_id: ${started.task_id}). ` +
                  `Call check_presentation_status with this task_id to get the download link.\n\n` +
                  '```json\n' +
                  JSON.stringify(started, null, 2) +
                  '\n```',
              },
            ],
          };
        }

        const result = await generateAndWait(input);

        if (result.status === 'error') {
          return {
            content: [
              {
                type: 'text',
                text: `Presentation generation failed.\n\n\`\`\`json\n${JSON.stringify(result, null, 2)}\n\`\`\``,
              },
            ],
            isError: true,
          };
        }

        return {
          content: [
            {
              type: 'text',
              text:
                `Presentation ready. Download it at: ${result.download_url}\n` +
                (result.edit_url ? `Edit it in the browser at: ${result.edit_url}\n` : '') +
                '\n```json\n' +
                JSON.stringify(result, null, 2) +
                '\n```',
            },
          ],
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return {
          content: [{ type: 'text', text: `Presentation generation failed: ${message}` }],
          isError: true,
        };
      }
    },
  );

  server.registerTool(
    'check_presentation_status',
    {
      description:
        'Poll the status of a presentation generation job previously started with generate_presentation ' +
        '(usually with wait_for_completion=false). Returns pending/completed/error plus the download link once ready.',
      inputSchema: checkStatusSchema,
    },
    async ({ task_id }) => {
      try {
        const status = await getJobStatus(task_id);
        return {
          content: [{ type: 'text', text: '```json\n' + JSON.stringify(status, null, 2) + '\n```' }],
          isError: status.status === 'error',
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return {
          content: [{ type: 'text', text: `Could not check status: ${message}` }],
          isError: true,
        };
      }
    },
  );

  return server;
}
