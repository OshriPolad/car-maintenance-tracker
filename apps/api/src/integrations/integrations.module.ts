import { Module } from "@nestjs/common";
import { PlateLookupService } from "./plate-lookup.service";
import { VehiclesLookupController } from "./vehicles-lookup.controller";

@Module({
  controllers: [VehiclesLookupController],
  providers: [PlateLookupService],
  exports: [PlateLookupService],
})
export class IntegrationsModule {}