// Gerado via Supabase MCP (generate_typescript_types) — projeto estudo_concurso.
// Regenerar após qualquer mudança de schema.
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      blocos_dia: {
        Row: {
          concluido: boolean
          concluido_at: string | null
          concurso_id: string | null
          created_at: string
          data: string
          duracao_min: number
          id: string
          materia_id: string | null
          ordem: number
          titulo: string
          user_id: string
        }
        Insert: {
          concluido?: boolean
          concluido_at?: string | null
          concurso_id?: string | null
          created_at?: string
          data: string
          duracao_min?: number
          id?: string
          materia_id?: string | null
          ordem?: number
          titulo: string
          user_id?: string
        }
        Update: {
          concluido?: boolean
          concluido_at?: string | null
          concurso_id?: string | null
          created_at?: string
          data?: string
          duracao_min?: number
          id?: string
          materia_id?: string | null
          ordem?: number
          titulo?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "blocos_dia_concurso_id_fkey"
            columns: ["concurso_id"]
            isOneToOne: false
            referencedRelation: "concursos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blocos_dia_materia_id_fkey"
            columns: ["materia_id"]
            isOneToOne: false
            referencedRelation: "materias"
            referencedColumns: ["id"]
          },
        ]
      }
      ciclo_itens: {
        Row: {
          concluido: boolean
          concluido_at: string | null
          concurso_id: string
          created_at: string
          id: string
          materia_id: string
          ordem: number
          user_id: string
          voltas: number
        }
        Insert: {
          concluido?: boolean
          concluido_at?: string | null
          concurso_id: string
          created_at?: string
          id?: string
          materia_id: string
          ordem?: number
          user_id?: string
          voltas?: number
        }
        Update: {
          concluido?: boolean
          concluido_at?: string | null
          concurso_id?: string
          created_at?: string
          id?: string
          materia_id?: string
          ordem?: number
          user_id?: string
          voltas?: number
        }
        Relationships: [
          {
            foreignKeyName: "ciclo_itens_concurso_id_fkey"
            columns: ["concurso_id"]
            isOneToOne: false
            referencedRelation: "concursos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ciclo_itens_materia_id_fkey"
            columns: ["materia_id"]
            isOneToOne: false
            referencedRelation: "materias"
            referencedColumns: ["id"]
          },
        ]
      }
      concurso_materias: {
        Row: {
          area: string
          concurso_id: string
          created_at: string
          id: string
          materia_id: string
          ordem: number
          peso_questoes: number | null
          user_id: string
        }
        Insert: {
          area?: string
          concurso_id: string
          created_at?: string
          id?: string
          materia_id: string
          ordem?: number
          peso_questoes?: number | null
          user_id?: string
        }
        Update: {
          area?: string
          concurso_id?: string
          created_at?: string
          id?: string
          materia_id?: string
          ordem?: number
          peso_questoes?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "concurso_materias_concurso_id_fkey"
            columns: ["concurso_id"]
            isOneToOne: false
            referencedRelation: "concursos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "concurso_materias_materia_id_fkey"
            columns: ["materia_id"]
            isOneToOne: false
            referencedRelation: "materias"
            referencedColumns: ["id"]
          },
        ]
      }
      concursos: {
        Row: {
          banca: string | null
          cor: string
          created_at: string
          data_prova: string | null
          duracao_prova: string | null
          estrutura: Json
          icone: string
          id: string
          nome: string
          nome_curto: string | null
          nota_data: string | null
          ordem: number
          orgao: string | null
          slug: string
          status: string
          user_id: string
        }
        Insert: {
          banca?: string | null
          cor?: string
          created_at?: string
          data_prova?: string | null
          duracao_prova?: string | null
          estrutura?: Json
          icone?: string
          id?: string
          nome: string
          nome_curto?: string | null
          nota_data?: string | null
          ordem?: number
          orgao?: string | null
          slug: string
          status?: string
          user_id?: string
        }
        Update: {
          banca?: string | null
          cor?: string
          created_at?: string
          data_prova?: string | null
          duracao_prova?: string | null
          estrutura?: Json
          icone?: string
          id?: string
          nome?: string
          nome_curto?: string | null
          nota_data?: string | null
          ordem?: number
          orgao?: string | null
          slug?: string
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      dias_concluidos: {
        Row: {
          created_at: string
          data: string
          horas_estudadas: number | null
          id: string
          nota: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          data: string
          horas_estudadas?: number | null
          id?: string
          nota?: string | null
          user_id?: string
        }
        Update: {
          created_at?: string
          data?: string
          horas_estudadas?: number | null
          id?: string
          nota?: string | null
          user_id?: string
        }
        Relationships: []
      }
      eventos: {
        Row: {
          concluido: boolean
          concurso_id: string | null
          created_at: string
          data: string
          descricao: string | null
          id: string
          tipo: string
          titulo: string
          user_id: string
        }
        Insert: {
          concluido?: boolean
          concurso_id?: string | null
          created_at?: string
          data: string
          descricao?: string | null
          id?: string
          tipo?: string
          titulo: string
          user_id?: string
        }
        Update: {
          concluido?: boolean
          concurso_id?: string | null
          created_at?: string
          data?: string
          descricao?: string | null
          id?: string
          tipo?: string
          titulo?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "eventos_concurso_id_fkey"
            columns: ["concurso_id"]
            isOneToOne: false
            referencedRelation: "concursos"
            referencedColumns: ["id"]
          },
        ]
      }
      ferramentas: {
        Row: {
          created_at: string
          icone: string | null
          id: string
          ordem: number
          titulo: string
          url: string
          user_id: string
        }
        Insert: {
          created_at?: string
          icone?: string | null
          id?: string
          ordem?: number
          titulo: string
          url: string
          user_id?: string
        }
        Update: {
          created_at?: string
          icone?: string | null
          id?: string
          ordem?: number
          titulo?: string
          url?: string
          user_id?: string
        }
        Relationships: []
      }
      materia_aliases: {
        Row: {
          alias_normalizado: string
          created_at: string
          id: string
          materia_id: string
          user_id: string
        }
        Insert: {
          alias_normalizado: string
          created_at?: string
          id?: string
          materia_id: string
          user_id?: string
        }
        Update: {
          alias_normalizado?: string
          created_at?: string
          id?: string
          materia_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "materia_aliases_materia_id_fkey"
            columns: ["materia_id"]
            isOneToOne: false
            referencedRelation: "materias"
            referencedColumns: ["id"]
          },
        ]
      }
      materias: {
        Row: {
          created_at: string
          icone: string
          id: string
          nome: string
          slug: string
          user_id: string
        }
        Insert: {
          created_at?: string
          icone?: string
          id?: string
          nome: string
          slug: string
          user_id?: string
        }
        Update: {
          created_at?: string
          icone?: string
          id?: string
          nome?: string
          slug?: string
          user_id?: string
        }
        Relationships: []
      }
      metas_periodo: {
        Row: {
          created_at: string
          data_fim: string
          data_inicio: string
          descricao: string | null
          horas_dia: number
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          data_fim: string
          data_inicio: string
          descricao?: string | null
          horas_dia: number
          id?: string
          user_id?: string
        }
        Update: {
          created_at?: string
          data_fim?: string
          data_inicio?: string
          descricao?: string | null
          horas_dia?: number
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      notas: {
        Row: {
          atualizado_em: string
          conteudo: string
          created_at: string
          fixada: boolean
          id: string
          titulo: string | null
          user_id: string
        }
        Insert: {
          atualizado_em?: string
          conteudo?: string
          created_at?: string
          fixada?: boolean
          id?: string
          titulo?: string | null
          user_id?: string
        }
        Update: {
          atualizado_em?: string
          conteudo?: string
          created_at?: string
          fixada?: boolean
          id?: string
          titulo?: string | null
          user_id?: string
        }
        Relationships: []
      }
      questao_logs: {
        Row: {
          acertos: number
          created_at: string
          data: string
          id: string
          materia_id: string | null
          materia_texto: string | null
          origem: string
          topico_id: string | null
          total: number
          user_id: string
        }
        Insert: {
          acertos: number
          created_at?: string
          data: string
          id?: string
          materia_id?: string | null
          materia_texto?: string | null
          origem?: string
          topico_id?: string | null
          total: number
          user_id?: string
        }
        Update: {
          acertos?: number
          created_at?: string
          data?: string
          id?: string
          materia_id?: string | null
          materia_texto?: string | null
          origem?: string
          topico_id?: string | null
          total?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "questao_logs_materia_id_fkey"
            columns: ["materia_id"]
            isOneToOne: false
            referencedRelation: "materias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "questao_logs_topico_id_fkey"
            columns: ["topico_id"]
            isOneToOne: false
            referencedRelation: "topicos"
            referencedColumns: ["id"]
          },
        ]
      }
      sessoes_estudo: {
        Row: {
          bloco_id: string | null
          concurso_id: string | null
          created_at: string
          data: string
          id: string
          materia_id: string | null
          minutos: number
          origem: string
          user_id: string
        }
        Insert: {
          bloco_id?: string | null
          concurso_id?: string | null
          created_at?: string
          data: string
          id?: string
          materia_id?: string | null
          minutos: number
          origem?: string
          user_id?: string
        }
        Update: {
          bloco_id?: string | null
          concurso_id?: string | null
          created_at?: string
          data?: string
          id?: string
          materia_id?: string | null
          minutos?: number
          origem?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sessoes_estudo_bloco_id_fkey"
            columns: ["bloco_id"]
            isOneToOne: false
            referencedRelation: "blocos_dia"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sessoes_estudo_concurso_id_fkey"
            columns: ["concurso_id"]
            isOneToOne: false
            referencedRelation: "concursos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sessoes_estudo_materia_id_fkey"
            columns: ["materia_id"]
            isOneToOne: false
            referencedRelation: "materias"
            referencedColumns: ["id"]
          },
        ]
      }
      topico_links: {
        Row: {
          arquivo_path: string | null
          created_at: string
          id: string
          tipo: string
          titulo: string
          topico_id: string
          url: string
          user_id: string
        }
        Insert: {
          arquivo_path?: string | null
          created_at?: string
          id?: string
          tipo?: string
          titulo: string
          topico_id: string
          url: string
          user_id?: string
        }
        Update: {
          arquivo_path?: string | null
          created_at?: string
          id?: string
          tipo?: string
          titulo?: string
          topico_id?: string
          url?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "topico_links_topico_id_fkey"
            columns: ["topico_id"]
            isOneToOne: false
            referencedRelation: "topicos"
            referencedColumns: ["id"]
          },
        ]
      }
      topico_questoes: {
        Row: {
          comentario: string
          contexto: string | null
          created_at: string
          enunciado: string
          fonte: string | null
          gabarito: boolean
          id: string
          ordem: number
          respondida_em: string | null
          resposta: boolean | null
          status: string
          topico_id: string
          user_id: string
        }
        Insert: {
          comentario?: string
          contexto?: string | null
          created_at?: string
          enunciado: string
          fonte?: string | null
          gabarito: boolean
          id?: string
          ordem?: number
          respondida_em?: string | null
          resposta?: boolean | null
          status?: string
          topico_id: string
          user_id?: string
        }
        Update: {
          comentario?: string
          contexto?: string | null
          created_at?: string
          enunciado?: string
          fonte?: string | null
          gabarito?: boolean
          id?: string
          ordem?: number
          respondida_em?: string | null
          resposta?: boolean | null
          status?: string
          topico_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "topico_questoes_topico_id_fkey"
            columns: ["topico_id"]
            isOneToOne: false
            referencedRelation: "topicos"
            referencedColumns: ["id"]
          },
        ]
      }
      topico_textos: {
        Row: {
          atualizado_em: string
          conteudo: string
          created_at: string
          id: string
          leituras: number
          marcador: string | null
          ordem: number
          titulo: string
          topico_id: string
          user_id: string
        }
        Insert: {
          atualizado_em?: string
          conteudo?: string
          created_at?: string
          id?: string
          leituras?: number
          marcador?: string | null
          ordem?: number
          titulo?: string
          topico_id: string
          user_id?: string
        }
        Update: {
          atualizado_em?: string
          conteudo?: string
          created_at?: string
          id?: string
          leituras?: number
          marcador?: string | null
          ordem?: number
          titulo?: string
          topico_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "topico_textos_topico_id_fkey"
            columns: ["topico_id"]
            isOneToOne: false
            referencedRelation: "topicos"
            referencedColumns: ["id"]
          },
        ]
      }
      topicos: {
        Row: {
          created_at: string
          id: string
          materia_id: string
          ordem: number
          separador_apos: boolean
          status: string
          titulo: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          materia_id: string
          ordem?: number
          separador_apos?: boolean
          status?: string
          titulo: string
          user_id?: string
        }
        Update: {
          created_at?: string
          id?: string
          materia_id?: string
          ordem?: number
          separador_apos?: boolean
          status?: string
          titulo?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "topicos_materia_id_fkey"
            columns: ["materia_id"]
            isOneToOne: false
            referencedRelation: "materias"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      registrar_clique_questao: {
        Args: {
          p_data: string
          p_materia: string | null
          p_topico: string | null
          p_acerto: boolean
        }
        Returns: {
          acertos: number
          created_at: string
          data: string
          id: string
          materia_id: string | null
          materia_texto: string | null
          origem: string
          topico_id: string | null
          total: number
          user_id: string
        }
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

// Atalhos de linha usados pelo app
export type Concurso = Tables<"concursos">
export type Materia = Tables<"materias">
export type Topico = Tables<"topicos">
export type ConcursoMateria = Tables<"concurso_materias">
export type CicloItem = Tables<"ciclo_itens">
export type TopicoLink = Tables<"topico_links">
export type TopicoTexto = Tables<"topico_textos">
export type TopicoQuestao = Tables<"topico_questoes">
export type MetaPeriodo = Tables<"metas_periodo">
export type BlocoDia = Tables<"blocos_dia">
export type DiaConcluido = Tables<"dias_concluidos">
export type SessaoEstudo = Tables<"sessoes_estudo">
export type QuestaoLog = Tables<"questao_logs">
export type MateriaAlias = Tables<"materia_aliases">
export type Evento = Tables<"eventos">
export type Nota = Tables<"notas">
export type Ferramenta = Tables<"ferramentas">

export type TopicoStatus = "nao_estudado" | "estudando" | "revisar" | "concluido"
export type QuestaoStatus = "ativa" | "revisar" | "arquivada"
