
/***** Using Zod for validation of input and displaying errors *****/

import { z } from "zod";

export const OrderItemSchema = z.object({
  title: z.string().min(1),
  sku: z.string().optional(),
  quantity: z.number().int().min(1),
  unitPrice: z.number().nonnegative().optional(),
  currency: z.string().min(3).max(3).optional(), 
});

export const CreateOrderSchema = z.object({
  orderNumber: z.string().min(1),
  buyerName: z.string().min(1),
  buyerEmail: z.string().email().optional(),

  shippingName: z.string().min(1),
  shippingAddress1: z.string().min(1),
  shippingAddress2: z.string().optional(),
  shippingCity: z.string().min(1),
  shippingPostalCode: z.string().min(1),
  shippingProvince: z.string().optional(),
  shippingCountry: z.string().min(2),

  status: z.enum(["NOT_SHIPPED", "SHIPPED", "CANCELLED"]).optional(),
  items: z.array(OrderItemSchema).min(1),
});

export const PaginationSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional(),
  offset: z.coerce.number().int().min(0).optional(),
});

export const UpdateStatusSchema = z.object({
  status: z.enum(["NOT_SHIPPED", "SHIPPED", "CANCELLED"]),
});

export const ChatSchema = z.object({
  orderId: z.number().int().positive(),
  message: z.string().min(1),
  language: z.enum(["it", "en"]).optional().default("it"),
  tone: z.enum(["neutral", "friendly", "professional"]).optional().default("professional"),
});