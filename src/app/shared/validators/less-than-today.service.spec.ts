import { TestBed } from '@angular/core/testing';

import { LessThanTodayService } from './less-than-today.service';

describe('LessThanTodayService', () => {
  let service: LessThanTodayService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(LessThanTodayService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
