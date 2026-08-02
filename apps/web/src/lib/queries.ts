'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { VaultType, VaultEntry, Folder, FileEntry, Album, Backup } from '@vaultx/shared';
import { api } from '@/lib/api';
import { useAuth } from '@/context/auth-context';

export const vaultKeys = {
  all: ['vault'] as const,
  list: (type: string, params: Record<string, unknown>) => ['vault', type, params] as const,
  folders: ['folders'] as const,
  files: (params: Record<string, unknown>) => ['files', params] as const,
  albums: ['albums'] as const,
  stats: ['stats'] as const,
  security: ['security'] as const,
  backups: ['backups'] as const,
  notifications: ['notifications'] as const,
  devices: ['devices'] as const,
  sessions: ['sessions'] as const,
  audit: ['audit'] as const,
  history: ['history'] as const,
};

export function useVaultEntries(type?: VaultType | 'all', params: Record<string, unknown> = {}) {
  const { dek } = useAuth();
  const key = ['vault', type ?? 'all', params] as const;
  return useQuery({
    queryKey: key,
    queryFn: () => api.get<VaultEntry[]>(`/vault?${toQuery({ ...params, type: type === 'all' || !type ? undefined : type })}`),
    enabled: !!dek,
  });
}

export function useFolders(type?: VaultType | 'all') {
  const { dek } = useAuth();
  return useQuery({
    queryKey: ['folders', type],
    queryFn: () => api.get<Folder[]>(`/vault/folders${type && type !== 'all' ? `?type=${type}` : ''}`),
    enabled: !!dek,
  });
}

export function useFiles(params: Record<string, unknown> = {}) {
  const { dek } = useAuth();
  return useQuery({
    queryKey: ['files', params],
    queryFn: () => api.get<FileEntry[]>(`/files?${toQuery(params)}`),
    enabled: !!dek,
  });
}

export function useAlbums() {
  const { dek } = useAuth();
  return useQuery({ queryKey: ['albums'], queryFn: () => api.get<Album[]>('/files/albums'), enabled: !!dek });
}

export interface StatsResponse {
  totalItems: number;
  byType: Record<string, number>;
  recentItems: VaultEntry[];
  filesCount: number;
  storageUsedBytes: number;
  security: {
    score: number;
    twoFactorEnabled: boolean;
    activeSessions: number;
    trustedDevices: number;
    failedLogins24h: number;
    recentLogins: Array<{ _id: string; type: string; ip?: string; createdAt: string }>;
  };
  unread: number;
}

export function useStats() {
  const { dek } = useAuth();
  return useQuery({ queryKey: ['stats'], queryFn: () => api.get<StatsResponse>('/app/stats'), enabled: !!dek });
}

export function useBackups() {
  const { dek } = useAuth();
  return useQuery({ queryKey: ['backups'], queryFn: () => api.get<Backup[]>('/backup'), enabled: !!dek });
}

export function useVaultMutation() {
  const queryClient = useQueryClient();
  const invalidateVault = () => queryClient.invalidateQueries({ queryKey: vaultKeys.all });
  const invalidateFiles = () => queryClient.invalidateQueries({ queryKey: ['files'] });
  const invalidateStats = () => queryClient.invalidateQueries({ queryKey: ['stats'] });

  const createEntry = useMutation({
    mutationFn: (body: { type: VaultType; encrypted: string; iv: string; title: string; folderId?: string | null; tags?: string[]; favorite?: boolean; pinned?: boolean }) =>
      api.post<VaultEntry>('/vault', body),
    onSuccess: () => {
      invalidateVault();
      invalidateStats();
    },
  });

  const updateEntry = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<VaultEntry> }) => api.patch<VaultEntry>(`/vault/${id}`, patch),
    onSuccess: () => invalidateVault(),
  });

  const softDelete = useMutation({
    mutationFn: (id: string) => api.delete(`/vault/${id}`),
    onSuccess: () => invalidateVault(),
  });

  const restoreEntry = useMutation({
    mutationFn: (id: string) => api.post<VaultEntry>(`/vault/${id}/restore`),
    onSuccess: () => invalidateVault(),
  });

  const permanentDelete = useMutation({
    mutationFn: (id: string) => api.delete(`/vault/${id}/permanent`),
    onSuccess: () => invalidateVault(),
  });

  const emptyTrash = useMutation({
    mutationFn: () => api.post('/vault/trash/empty'),
    onSuccess: () => invalidateVault(),
  });

  const createFolder = useMutation({
    mutationFn: (body: { name: string; type?: VaultType | 'all'; color?: string }) => api.post<Folder>('/vault/folders', body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: vaultKeys.folders }),
  });

  const deleteFolder = useMutation({
    mutationFn: (id: string) => api.delete(`/vault/folders/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: vaultKeys.folders });
      invalidateVault();
    },
  });

  const deleteFile = useMutation({
    mutationFn: (id: string) => api.delete(`/files/${id}`),
    onSuccess: invalidateFiles,
  });

  const restoreFile = useMutation({
    mutationFn: (id: string) => api.post(`/files/${id}/restore`),
    onSuccess: invalidateFiles,
  });

  const permanentDeleteFile = useMutation({
    mutationFn: (id: string) => api.delete(`/files/${id}/permanent`),
    onSuccess: invalidateFiles,
  });

  const emptyFileTrash = useMutation({
    mutationFn: () => api.post('/files/trash/empty'),
    onSuccess: invalidateFiles,
  });

  const toggleFileFavorite = useMutation({
    mutationFn: (id: string) => api.post(`/files/${id}/toggle-favorite`),
    onSuccess: invalidateFiles,
  });

  return {
    invalidateVault,
    invalidateFiles,
    invalidateStats,
    createEntry,
    updateEntry,
    softDelete,
    restoreEntry,
    permanentDelete,
    emptyTrash,
    createFolder,
    deleteFolder,
    deleteFile,
    restoreFile,
    permanentDeleteFile,
    emptyFileTrash,
    toggleFileFavorite,
  };
}

export function toQuery(params: Record<string, unknown>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') search.set(key, String(value));
  }
  return search.toString();
}
