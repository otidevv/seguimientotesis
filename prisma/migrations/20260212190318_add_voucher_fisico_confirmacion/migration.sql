-- AlterTable
ALTER TABLE "thesis" ADD COLUMN     "voucher_fisico_entregado" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "voucher_fisico_fecha" TIMESTAMP(3);
