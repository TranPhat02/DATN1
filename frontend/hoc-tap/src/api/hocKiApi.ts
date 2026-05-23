import { createCrudApi } from './crudApi';
import type { HocKi, HocKiCreate, HocKiUpdate } from '../shared/types';

export const hocKiApi = createCrudApi<HocKi, HocKiCreate, HocKiUpdate>('/hoc-ki');
