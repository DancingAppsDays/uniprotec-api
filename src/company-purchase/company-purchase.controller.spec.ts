import { Test, TestingModule } from '@nestjs/testing';
import { CompanyPurchaseController } from './company-purchase.controller';
import { CompanyPurchaseService } from './company-purchase.service';

describe('CompanyPurchaseController', () => {
  let controller: CompanyPurchaseController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CompanyPurchaseController],
      providers: [CompanyPurchaseService],
    }).compile();

    controller = module.get<CompanyPurchaseController>(CompanyPurchaseController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
