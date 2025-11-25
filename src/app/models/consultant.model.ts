export interface Consultant {
  id: string;
  nome: string;
  email: string;
  telefone?: string;
  area?: string;
  dataCadastro?: string;
}

export interface ConsultantInput {
  nome: string;
  email: string;
  telefone?: string;
  area?: string;
}

export interface ConsultantUpdate extends Partial<ConsultantInput> {
  id: string;
}
