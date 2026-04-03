import { TestBed } from '@angular/core/testing';

import { CurrentPassValidatorService } from './current-pass-validator.service';

describe('CurrentPassValidatorService', () => {
  let service: CurrentPassValidatorService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(CurrentPassValidatorService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
