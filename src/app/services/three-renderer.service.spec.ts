import { TestBed } from '@angular/core/testing';

import { ThreeRenderer } from './three-renderer.service';

describe('ThreeRenderer', () => {
  let service: ThreeRenderer;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ThreeRenderer);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
