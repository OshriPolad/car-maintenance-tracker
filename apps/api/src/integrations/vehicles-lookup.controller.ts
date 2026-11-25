import { Controller, Get, Param } from "@nestjs/common";
import {
  ApiBadGatewayResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiTags,
} from "@nestjs/swagger";
import type { VehicleLookupResult } from "./data-gov-mapper";
import { PlateLookupService } from "./plate-lookup.service";

@ApiTags("vehicles")
@Controller("vehicles")
export class VehiclesLookupController {
  constructor(private readonly plateLookupService: PlateLookupService) {}

  @Get("lookup/:plate")
  @ApiOkResponse({ description: "Vehicle details found in data.gov.il" })
  @ApiNotFoundResponse({ description: "Vehicle plate not found in datasets" })
  @ApiBadGatewayResponse({ description: "External data.gov.il API error or timeout" })
  lookup(@Param("plate") plate: string): Promise<VehicleLookupResult> {
    return this.plateLookupService.lookup(plate);
  }
}
