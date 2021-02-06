// src/Modules/TypeScript/Regex.ts
export const objectExport = /^\{$\n(?<coreCode>((?<indent>^\s+)\S+\s+=\s+\{$\n\k<indent>{2}.*$\n^\k<indent>\};$\n^)+)^\}$/gmu;

export const processNodeReplacement = /if\s+\(process\.env\.NODE_ENV \S+\s"production"\)\s{\n\s+\(function\(\)\s{\n(?<coreCode>(.*\n?)*)}\)\(\);\n}/gim;

export const exportsHandler = /(^exports\.(?<exports>\S+)(?=\s+=.*$))(?=.*exports\.\k<exports>\s+=)/gmsu;
