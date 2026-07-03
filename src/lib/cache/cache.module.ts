import { CacheModule } from "@nestjs/cache-manager";
import { Global, Module } from "@nestjs/common";

@Global()
@Module({
  imports: [
    CacheModule.register({
      isGlobal: true,
      ttl: 86_400_000,
    }),
  ],
  exports: [CacheModule],
})
export class AppCacheModule {}
