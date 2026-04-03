import { TestBed } from '@angular/core/testing';

import { NotEqualFieldsService } from '../validators/not-equal-fields.service';

describe('NotEqualFieldsService', () => {
  let service: NotEqualFieldsService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(NotEqualFieldsService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
