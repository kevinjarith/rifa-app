ALTER TABLE "tickets" ADD CONSTRAINT "tickets_number_range" CHECK ("number" >= 0 AND "number" <= 999);
