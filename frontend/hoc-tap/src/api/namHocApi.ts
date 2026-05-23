import { createCrudApi } from './crudApi';
import type { NamHoc, NamHocCreate, NamHocUpdate } from '../shared/types';

export const namHocApi = createCrudApi<NamHoc, NamHocCreate, NamHocUpdate>('/nam-hoc');
