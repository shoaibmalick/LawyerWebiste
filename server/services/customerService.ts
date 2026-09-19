import { prisma } from "@/lib/prisma";

type CreateCustomerInput = {
  name: string;
  email: string;
  passwordHash: string;
};

function findByEmail(email: string) {
  return prisma.customer.findUnique({ where: { email } });
}

function createCustomer(input: CreateCustomerInput) {
  return prisma.customer.create({ data: input });
}

export const customerService = {
  findByEmail,
  createCustomer,
};
