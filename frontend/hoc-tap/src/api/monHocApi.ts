import { createCrudApi } from './crudApi';
import type { MonHoc, MonHocCreate, MonHocUpdate } from '../shared/types';

export const monHocApi = createCrudApi<MonHoc, MonHocCreate, MonHocUpdate>('/mon-hoc');
