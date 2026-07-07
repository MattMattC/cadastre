import type { AnnotationProject, Parcelle } from "../types";

const PROJECTS_KEY = "cadastre-bis:projects";
const PENDING_KEY = "cadastre-bis:pending-parcelles";

// --- Parcelles « en attente » (passées de la carte vers l'éditeur) ---

export function setPendingParcelles(parcelles: Parcelle[]): void {
  sessionStorage.setItem(PENDING_KEY, JSON.stringify(parcelles));
}

/** @deprecated Utiliser setPendingParcelles */
export function setPendingParcelle(parcelle: Parcelle): void {
  setPendingParcelles([parcelle]);
}

export function getPendingParcelles(): Parcelle[] {
  const raw = sessionStorage.getItem(PENDING_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as Parcelle | Parcelle[];
    return Array.isArray(parsed) ? parsed : [parsed];
  } catch {
    return [];
  }
}

/** @deprecated Utiliser getPendingParcelles */
export function getPendingParcelle(): Parcelle | null {
  const all = getPendingParcelles();
  return all[0] ?? null;
}

/** Normalise parcelles depuis un projet (rétrocompat ancien champ `parcelle`). */
export function projectParcelles(project: AnnotationProject): Parcelle[] {
  if (project.parcelles?.length) return project.parcelles;
  if (project.parcelle) return [project.parcelle];
  return [];
}

// --- Projets sauvegardés (localStorage) ---

export function listProjects(): AnnotationProject[] {
  const raw = localStorage.getItem(PROJECTS_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as AnnotationProject[];
  } catch {
    return [];
  }
}

export function getProject(id: string): AnnotationProject | null {
  return listProjects().find((p) => p.id === id) ?? null;
}

// Enregistre (crée ou met à jour) un projet et renvoie sa version persistée.
export function saveProject(project: AnnotationProject): AnnotationProject {
  const all = listProjects();
  const index = all.findIndex((p) => p.id === project.id);
  const updated: AnnotationProject = { ...project, updatedAt: Date.now() };

  if (index >= 0) {
    all[index] = updated;
  } else {
    all.push(updated);
  }
  localStorage.setItem(PROJECTS_KEY, JSON.stringify(all));
  return updated;
}

export function deleteProject(id: string): void {
  const all = listProjects().filter((p) => p.id !== id);
  localStorage.setItem(PROJECTS_KEY, JSON.stringify(all));
}

export function newId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `id-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
