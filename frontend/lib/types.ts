export type Tone = 'default' | 'casual' | 'professional' | 'funny' | 'educational' | 'sales_pitch';
export type Verbosity = 'concise' | 'standard' | 'text-heavy';
export type ExportFormat = 'pptx' | 'pdf';

export interface GenerateRequestBody {
  content: string;
  instructions?: string;
  n_slides: number;
  language?: string;
  tone: Tone;
  verbosity: Verbosity;
  template?: string;
  export_as: ExportFormat;
  include_title_slide: boolean;
  include_table_of_contents: boolean;
}

export interface StartJobResponse {
  task_id?: string;
  status?: string;
  message?: string;
  error?: string;
}

export interface StatusResponse {
  task_id?: string;
  status?: 'pending' | 'completed' | 'error' | string;
  message?: string;
  created_slides?: number | null;
  remaining_slides?: number | null;
  download_url?: string | null;
  edit_url?: string | null;
  error?: string;
}
