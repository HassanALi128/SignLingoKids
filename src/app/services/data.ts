import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class DataService {
  constructor(private http: HttpClient) {}

  async loadCategories(): Promise<any[]> {
    return firstValueFrom(this.http.get<any[]>('../../assets/data/categories.json'));
  }
}
