import { Test, TestingModule } from '@nestjs/testing';
import { CompanyPurchaseService } from './company-purchase.service';

describe('CompanyPurchaseService', () => {
  let service: CompanyPurchaseService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CompanyPurchaseService],
    }).compile();

    service = module.get<CompanyPurchaseService>(CompanyPurchaseService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
