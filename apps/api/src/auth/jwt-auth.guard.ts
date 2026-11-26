import { Injectable } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";

/**
 * Protects a route: no valid access token -> 401.
 * Usage: @UseGuards(JwtAuthGuard) on a controller or a single route.
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard("jwt") {}
