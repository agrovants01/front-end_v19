import { TestBed } from '@angular/core/testing';

import { WeekValidatorService } from './week-validator.service';

describe('WeekValidatorService', () => {
  let service: WeekValidatorService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(WeekValidatorService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
