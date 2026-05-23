import { createCrudApi } from './crudApi';
import type { SinhVien, SinhVienCreate, SinhVienUpdate } from '../shared/types';

export const sinhVienApi = createCrudApi<SinhVien, SinhVienCreate, SinhVienUpdate>('/sinh-vien');
