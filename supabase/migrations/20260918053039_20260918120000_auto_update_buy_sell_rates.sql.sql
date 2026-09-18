/*
# Auto-update buy_rate and sell_rate on commission/rate changes

## Purpose
When the base exchange rate (current_rate) changes in the currencies table,
or when buy_commission/sell_commission changes in the commissions table,
the stored buy_rate and sell_rate in the commissions table must be recalculated
automatically so the displayed buy/sell prices always match the latest rate.

## What it does
1. Creates a trigger function `update_commission_rates()` that:
   - Reads the currency's current_rate from the currencies table.
   - Computes buy_rate = round(current_rate - buy_commission/100, 2)
   - Computes sell_rate = round(current_rate + sell_commission/100, 2)
   - Updates the commissions row with the new buy_rate and sell_rate.
2. Attaches the trigger to the `currencies` table (AFTER UPDATE of current_rate).
   When current_rate changes, ALL commission rows for that currency code are updated.
3. Attaches the trigger to the `commissions` table (AFTER INSERT or UPDATE of
   buy_commission/sell_commission). When commissions change, that row's
   buy_rate and sell_rate are recalculated.

## Tables affected
- `currencies` — read current_rate, trigger on UPDATE of current_rate
- `commissions` — update buy_rate/sell_rate, trigger on INSERT/UPDATE of buy_commission/sell_commission

## Security
- The trigger function runs with SECURITY DEFINER so it can update commissions
  regardless of the caller's RLS role.
- No new policies are added; existing RLS remains unchanged.
*/

-- ── Trigger function: recalculate buy_rate / sell_rate ──
CREATE OR REPLACE FUNCTION update_commission_rates()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_rate numeric;
  v_buy_commission integer;
  v_sell_commission integer;
  v_currency_code text;
BEGIN
  -- Case 1: trigger on currencies table (current_rate changed)
  IF TG_TABLE_NAME = 'currencies' AND TG_OP = 'UPDATE' THEN
    v_currency_code := NEW.code;
    v_current_rate := NEW.current_rate;

    IF v_current_rate IS NULL OR v_current_rate <= 0 THEN
      RETURN NEW;
    END IF;

    -- Update all commission rows for this currency code
    UPDATE commissions
      SET buy_rate  = round(v_current_rate - buy_commission / 100.0, 2),
          sell_rate = round(v_current_rate + sell_commission / 100.0, 2),
          updated_at = now()
      WHERE currency_code = v_currency_code;

    RETURN NEW;
  END IF;

  -- Case 2: trigger on commissions table (insert or commission changed)
  IF TG_TABLE_NAME = 'commissions' THEN
    v_currency_code := NEW.currency_code;
    v_buy_commission := NEW.buy_commission;
    v_sell_commission := NEW.sell_commission;

    -- Fetch the current_rate for this currency
    SELECT current_rate INTO v_current_rate
      FROM currencies
      WHERE code = v_currency_code
      LIMIT 1;

    IF v_current_rate IS NULL OR v_current_rate <= 0 THEN
      -- No rate available yet; leave buy_rate/sell_rate as-is
      RETURN NEW;
    END IF;

    -- Recalculate and update this row
    NEW.buy_rate  := round(v_current_rate - v_buy_commission / 100.0, 2);
    NEW.sell_rate := round(v_current_rate + v_sell_commission / 100.0, 2);
    NEW.updated_at := now();

    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$$;

-- ── Trigger on currencies: when current_rate changes, update all commissions ──
DROP TRIGGER IF EXISTS trg_currencies_rate_changed ON currencies;
CREATE TRIGGER trg_currencies_rate_changed
  AFTER UPDATE OF current_rate ON currencies
  FOR EACH ROW
  EXECUTE FUNCTION update_commission_rates();

-- ── Trigger on commissions: when commissions change or row is inserted, recalc rates ──
DROP TRIGGER IF EXISTS trg_commissions_recalc ON commissions;
CREATE TRIGGER trg_commissions_recalc
  BEFORE INSERT OR UPDATE OF buy_commission, sell_commission ON commissions
  FOR EACH ROW
  EXECUTE FUNCTION update_commission_rates();
