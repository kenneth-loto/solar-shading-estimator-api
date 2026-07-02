import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from "@nestjs/common";
import type { Response } from "express";
import { Prisma } from "../prisma.js";

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const res = exception.getResponse();

      if (typeof res === "object" && res !== null && "errors" in res) {
        const { message, errors } = res as {
          message: string;
          errors: unknown;
        };
        response.status(status).json({ statusCode: status, message, errors });
        return;
      }

      response
        .status(status)
        .json({ statusCode: status, message: exception.message, data: null });
      return;
    }

    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      if (exception.code === "P2002") {
        const field = (
          exception.meta as { target?: string[] } | undefined
        )?.target?.join(", ");
        response.status(HttpStatus.CONFLICT).json({
          statusCode: HttpStatus.CONFLICT,
          message: field
            ? `Resource with this ${field} already exists`
            : "Resource already exists",
          data: null,
        });
        return;
      }

      if (exception.code === "P2025") {
        const cause = (exception.meta as { cause?: string } | undefined)?.cause;
        response.status(HttpStatus.NOT_FOUND).json({
          statusCode: HttpStatus.NOT_FOUND,
          message: cause ?? "Resource not found",
          data: null,
        });
        return;
      }

      if (exception.code === "P2003") {
        const field = (exception.meta as { field_name?: string } | undefined)
          ?.field_name;
        response.status(HttpStatus.BAD_REQUEST).json({
          statusCode: HttpStatus.BAD_REQUEST,
          message: field
            ? `Referenced ${field} does not exist`
            : "Foreign key constraint failed",
          data: null,
        });
        return;
      }

      this.logger.error(
        `Unhandled Prisma error: ${exception.code}`,
        exception.stack,
      );
      response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: "Database error",
        data: null,
      });
      return;
    }

    this.logger.error(
      "Unhandled exception",
      exception instanceof Error ? exception.stack : String(exception),
    );

    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: "Internal server error",
      data: null,
    });
  }
}
