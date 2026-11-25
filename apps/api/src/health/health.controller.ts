import { Controller, Get, NotFoundException } from "@nestjs/common";
import { ApiExcludeEndpoint, ApiOkResponse, ApiTags } from "@nestjs/swagger";
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

  /** Throws on purpose to verify that errors reach Sentry. Only active when SENTRY_DEBUG=true. */
  @Get("sentry-test")
  @ApiExcludeEndpoint()
  sentryTest(): never {
    if (process.env.SENTRY_DEBUG !== "true") {
      throw new NotFoundException();
    }
    throw new Error("Sentry test error from the API");
  }
}
