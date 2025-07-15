-- Function to update total_credits when credit_transactions are added
CREATE OR REPLACE FUNCTION update_user_credits()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE profiles 
  SET total_credits = total_credits + NEW.amount
  WHERE id = NEW.user_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to automatically update credits (recreate to ensure it's up-to-date)
DROP TRIGGER IF EXISTS on_credit_transaction_created ON public.credit_transactions;
CREATE TRIGGER on_credit_transaction_created
  AFTER INSERT ON public.credit_transactions
  FOR EACH ROW EXECUTE FUNCTION update_user_credits();
