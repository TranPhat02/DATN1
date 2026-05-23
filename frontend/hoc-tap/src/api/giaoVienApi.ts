import { createCrudApi } from './crudApi';
import type { GiaoVien, GiaoVienCreate, GiaoVienUpdate } from '../shared/types';

export const giaoVienApi = createCrudApi<GiaoVien, GiaoVienCreate, GiaoVienUpdate>('/giao-vien');
