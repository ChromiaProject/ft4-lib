export interface RellModuleStructure {
  operations?: Record<string, unknown>;
}

export interface RellAppStructure {
  modules: Record<string, RellModuleStructure>;
}
