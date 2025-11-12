# Excel/Google Sheets UUID Generator Formula

Use this if you want to generate truly random UUIDs instead of the sequential ones in the templates.

## Excel Formula (UUID v4)

```excel
=CONCATENATE(
  DEC2HEX(RANDBETWEEN(0,4294967295),8),"-",
  DEC2HEX(RANDBETWEEN(0,65535),4),"-",
  "4",DEC2HEX(RANDBETWEEN(0,4095),3),"-",
  DEC2HEX(RANDBETWEEN(32768,49151),4),"-",
  DEC2HEX(RANDBETWEEN(0,65535),4),
  DEC2HEX(RANDBETWEEN(0,4294967295),8)
)
```

## How to Use

1. **Open your CSV in Excel**
2. **Add the formula to cell A2** (assuming row 1 is headers)
3. **Drag down** to generate as many UUIDs as needed
4. **Copy and Paste as Values** to convert formulas to actual UUIDs

## Google Sheets Version

Same formula works in Google Sheets!

## Example

Put this in cell A2 and drag down:

```
=CONCATENATE(DEC2HEX(RANDBETWEEN(0,4294967295),8),"-",DEC2HEX(RANDBETWEEN(0,65535),4),"-","4",DEC2HEX(RANDBETWEEN(0,4095),3),"-",DEC2HEX(RANDBETWEEN(32768,49151),4),"-",DEC2HEX(RANDBETWEEN(0,65535),4),DEC2HEX(RANDBETWEEN(0,4294967295),8))
```

Results:

```
a7f3e9d2-1c4b-4a5e-8d9f-2b3c4d5e6f7a
b8e4f0c3-2d5a-4b6f-9e0a-3c4d5e6f7a8b
c9f5a1d4-3e6b-4c7a-0f1b-4d5e6f7a8b9c
```

## Sequential vs Random UUIDs

**Sequential (current templates):**

- ✅ Easy to understand relationships
- ✅ Predictable for testing
- ✅ Can manually trace foreign keys
- ❌ Not cryptographically secure (but doesn't matter for internal tool)

**Random (this formula):**

- ✅ Truly unique across systems
- ✅ Harder to guess/enumerate
- ❌ Foreign key relationships harder to see at a glance
- ❌ Must be very careful when creating relational data

## Recommendation

**For import templates:** Use the sequential UUIDs already in the templates - much easier to work with!

**For production after import:** Supabase will generate random UUIDs automatically for new records.

**If you really want random UUIDs in templates:** Use this formula, but be VERY careful to keep track of IDs when linking tables together. Consider using a spreadsheet with multiple tabs and VLOOKUP formulas to ensure foreign keys match correctly.
