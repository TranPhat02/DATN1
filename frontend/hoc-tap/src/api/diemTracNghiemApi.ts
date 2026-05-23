import { createCrudApi } from './crudApi';
import type { DiemTracNghiem, DiemTracNghiemCreate, DiemTracNghiemUpdate } from '../shared/types';

export const diemTracNghiemApi = createCrudApi<DiemTracNghiem, DiemTracNghiemCreate, DiemTracNghiemUpdate>('/diem-trac-nghiem');
