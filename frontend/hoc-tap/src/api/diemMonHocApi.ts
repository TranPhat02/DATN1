import { createCrudApi } from './crudApi';
import type { DiemMonHoc, DiemMonHocCreate, DiemMonHocUpdate } from '../shared/types';

export const diemMonHocApi = createCrudApi<DiemMonHoc, DiemMonHocCreate, DiemMonHocUpdate>('/diem-mon-hoc');
