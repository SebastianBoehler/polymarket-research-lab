#pragma once

#include <stdexcept>
#include <string>
#include <vector>

namespace polyarb
{
class MarketStreamValidationError : public std::runtime_error
{
public:
    using std::runtime_error::runtime_error;
};

struct MarketAskUpdate
{
    std::string asset_id;
    double best_ask;
};

// Validates legacy RTDS envelopes before callers apply any snapshot updates.
std::vector<MarketAskUpdate> parse_market_ask_updates(const std::string &message);
}
