[
  {
    "result": {
      "customers": [
        {
          "email": "mikaeltalberg@icloud.com",
          "id": "cus_TaNHK2sqVHvnnq",
          "created": "2025-12-11T16:16:12",
          "attrs": {
            "id": "cus_TaNHK2sqVHvnnq",
            "name": "test",
            "email": "mikaeltalberg@icloud.com",
            "phone": null,
            "object": "customer",
            "address": null,
            "balance": 0,
            "created": 1765469772,
            "currency": "nok",
            "discount": null,
            "livemode": false,
            "metadata": {},
            "shipping": null,
            "delinquent": false,
            "tax_exempt": "none",
            "test_clock": null,
            "description": null,
            "default_source": null,
            "invoice_prefix": "WGH6THWJ",
            "customer_account": null,
            "invoice_settings": {
              "footer": null,
              "custom_fields": null,
              "rendering_options": null,
              "default_payment_method": null
            },
            "preferred_locales": [
              "en-US"
            ],
            "next_invoice_sequence": 3
          },
          "name": "test"
        }
      ],
      "subscriptions": [
        {
          "currency": "nok",
          "current_period_start": null,
          "current_period_end": null,
          "attrs": {
            "id": "sub_1SdCbXDBhW4PsP0t4VrvgohY",
            "plan": {
              "id": "price_1SbgeCDBhW4PsP0trnc55LKc",
              "meter": null,
              "active": true,
              "amount": 10000,
              "object": "plan",
              "created": 1765108864,
              "product": "prod_TYoGOyD47FMCd7",
              "currency": "nok",
              "interval": "year",
              "livemode": false,
              "metadata": {},
              "nickname": null,
              "tiers_mode": null,
              "usage_type": "licensed",
              "amount_decimal": "10000",
              "billing_scheme": "per_unit",
              "interval_count": 1,
              "transform_usage": null,
              "trial_period_days": null
            },
            "items": {
              "url": "/v1/subscription_items?subscription=sub_1SdCbXDBhW4PsP0t4VrvgohY",
              "data": [
                {
                  "id": "si_TaNMLMWQSGXb6i",
                  "plan": {
                    "id": "price_1SbgeCDBhW4PsP0trnc55LKc",
                    "meter": null,
                    "active": true,
                    "amount": 10000,
                    "object": "plan",
                    "created": 1765108864,
                    "product": "prod_TYoGOyD47FMCd7",
                    "currency": "nok",
                    "interval": "year",
                    "livemode": false,
                    "metadata": {},
                    "nickname": null,
                    "tiers_mode": null,
                    "usage_type": "licensed",
                    "amount_decimal": "10000",
                    "billing_scheme": "per_unit",
                    "interval_count": 1,
                    "transform_usage": null,
                    "trial_period_days": null
                  },
                  "price": {
                    "id": "price_1SbgeCDBhW4PsP0trnc55LKc",
                    "type": "recurring",
                    "active": true,
                    "object": "price",
                    "created": 1765108864,
                    "product": "prod_TYoGOyD47FMCd7",
                    "currency": "nok",
                    "livemode": false,
                    "metadata": {},
                    "nickname": null,
                    "recurring": {
                      "meter": null,
                      "interval": "year",
                      "usage_type": "licensed",
                      "interval_count": 1,
                      "trial_period_days": null
                    },
                    "lookup_key": null,
                    "tiers_mode": null,
                    "unit_amount": 10000,
                    "tax_behavior": "inclusive",
                    "billing_scheme": "per_unit",
                    "custom_unit_amount": null,
                    "transform_quantity": null,
                    "unit_amount_decimal": "10000"
                  },
                  "object": "subscription_item",
                  "created": 1765470035,
                  "metadata": {},
                  "quantity": 1,
                  "discounts": [],
                  "tax_rates": [],
                  "subscription": "sub_1SdCbXDBhW4PsP0t4VrvgohY",
                  "billing_thresholds": null,
                  "current_period_end": 1797006035,
                  "current_period_start": 1765470035
                }
              ],
              "object": "list",
              "has_more": false,
              "total_count": 1
            },
            "object": "subscription",
            "status": "active",
            "created": 1765470035,
            "currency": "nok",
            "customer": "cus_TaNHK2sqVHvnnq",
            "ended_at": null,
            "livemode": false,
            "metadata": {},
            "quantity": 1,
            "schedule": null,
            "cancel_at": null,
            "discounts": [],
            "trial_end": null,
            "start_date": 1765470035,
            "test_clock": null,
            "application": null,
            "canceled_at": null,
            "description": null,
            "trial_start": null,
            "billing_mode": {
              "type": "flexible",
              "flexible": {
                "proration_discounts": "included"
              },
              "updated_at": 1765470035
            },
            "on_behalf_of": null,
            "automatic_tax": {
              "enabled": false,
              "liability": null,
              "disabled_reason": null
            },
            "transfer_data": null,
            "days_until_due": 30,
            "default_source": null,
            "latest_invoice": "in_1SdCbXDBhW4PsP0tliEYtun8",
            "pending_update": null,
            "trial_settings": {
              "end_behavior": {
                "missing_payment_method": "create_invoice"
              }
            },
            "customer_account": null,
            "invoice_settings": {
              "issuer": {
                "type": "self"
              },
              "account_tax_ids": null
            },
            "pause_collection": null,
            "payment_settings": {
              "payment_method_types": null,
              "payment_method_options": null,
              "save_default_payment_method": "off"
            },
            "collection_method": "send_invoice",
            "default_tax_rates": [],
            "billing_thresholds": null,
            "billing_cycle_anchor": 1765470035,
            "cancel_at_period_end": false,
            "cancellation_details": {
              "reason": null,
              "comment": null,
              "feedback": null
            },
            "pending_setup_intent": null,
            "default_payment_method": null,
            "application_fee_percent": null,
            "billing_cycle_anchor_config": null,
            "pending_invoice_item_interval": null,
            "next_pending_invoice_item_invoice": null
          },
          "customer": "cus_TaNHK2sqVHvnnq",
          "id": "sub_1SdCbXDBhW4PsP0t4VrvgohY"
        }
      ]
    }
  }
]