import { createCrudApi } from './crudApi';
import type { Lop, LopCreate, LopUpdate } from '../shared/types';

export const lopApi = createCrudApi<Lop, LopCreate, LopUpdate>('/lop');
