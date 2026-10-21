import { expect, it, vi } from 'vitest';
import fixture from '../fixtures/export-v1.json';
import { ExportFileSchema } from '@/lib/storage/schema';
import { downloadExport } from '@/lib/storage/export';
it('TC-099 FR-37 download uses a dated JSON Blob and revokes its URL after clicking', () => {
  const file = ExportFileSchema.parse(fixture);
  const create = vi.fn<(blob: Blob) => string>().mockReturnValue('blob:export');
  const revoke = vi.fn();
  vi.stubGlobal('URL', { createObjectURL: create, revokeObjectURL: revoke });
  let filename = '';
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
    this: HTMLAnchorElement,
  ) {
    filename = this.download;
    expect(revoke).not.toHaveBeenCalled();
  });
  downloadExport(file);
  expect(filename).toBe('rehearse-export-2026-10-21.json');
  expect(create.mock.calls[0]?.[0].type).toBe('application/json');
  expect(revoke).toHaveBeenCalledWith('blob:export');
  expect(document.querySelector('a[download]')).toBeNull();
});
