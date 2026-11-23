import { Controller, Get } from "@nestjs/common";
import { ApiOkResponse, ApiTags } from "@nestjs/swagger";
import type { HealthResponse } from "@cmt/shared";
import { HealthService } from "./health.service";

@ApiTags("health")
@Controller("health")
export class HealthController {
  constructor(private readonly health: HealthService) {}

  @Get()
  @ApiOkResponse({ description: "API is running; db shows whether PostgreSQL is reachable" })
  check(): Promise<HealthResponse> {
    return this.health.check();
  }
}
