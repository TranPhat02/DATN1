import { createCrudApi } from './crudApi';
import type { LopMonHoc, LopMonHocCreate, LopMonHocUpdate } from '../shared/types';

export const lopMonHocApi = createCrudApi<LopMonHoc, LopMonHocCreate, LopMonHocUpdate>('/lop-mon-hoc');
