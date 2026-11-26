import { Module } from "@nestjs/common";
import { UsersController } from "./users.controller";
import { UsersService } from "./users.service";

@Module({
  controllers: [UsersController],
  providers: [UsersService],
  // Exported so AuthModule can inject UsersService.
  exports: [UsersService],
})
export class UsersModule {}
