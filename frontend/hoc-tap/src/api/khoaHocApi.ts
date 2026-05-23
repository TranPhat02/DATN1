import { createCrudApi } from './crudApi';
import type { KhoaHoc } from '../shared/types';

export const khoaHocApi = createCrudApi<KhoaHoc, KhoaHoc, Partial<KhoaHoc>>('/khoa-hoc');
