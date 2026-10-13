#include <market_stream.hpp>
#include <nlohmann/json.hpp>
#include <algorithm>
#include <cmath>
#include <limits>
#include <stdexcept>

namespace polyarb
{
namespace
{
using json = nlohmann::json;

std::string text(const json &value)
{
    if (!value.is_string()) throw std::invalid_argument("expected string");
    const auto result = value.get<std::string>();
    if (result.find_first_not_of(" \t\n\r") == std::string::npos)
        throw std::invalid_argument("expected nonempty string");
    return result;
}

double number(const json &value)
{
    double result;
    if (value.is_number()) result = value.get<double>();
    else
    {
        const auto input = text(value);
        bool dot = false;
        bool digit_before = false;
        bool digit_after = false;
        for (char c : input)
        {
            if (c >= '0' && c <= '9')
            {
                if (dot) digit_after = true;
                else digit_before = true;
            }
            else if (c == '.' && !dot) dot = true;
            else throw std::invalid_argument("expected decimal number");
        }
        if (!digit_before || (dot && !digit_after))
            throw std::invalid_argument("expected decimal number");
        result = std::stod(input);
    }
    if (!std::isfinite(result)) throw std::invalid_argument("expected finite number");
    return result;
}

double validate_levels(const json &levels, bool asks)
{
    if (!levels.is_array()) throw std::invalid_argument("levels must be arrays");
    double best = std::numeric_limits<double>::infinity();
    for (const auto &level : levels)
    {
        if (!level.is_object()) throw std::invalid_argument("level must be an object");
        const double price = number(level.at("price"));
        const double size = number(level.at("size"));
        if (price < 0 || price > 1 || (asks && price == 0) || size <= 0)
            throw std::invalid_argument("invalid book price or size");
        best = std::min(best, price);
    }
    return levels.empty() ? 0 : best;
}

MarketAskUpdate parse_book(const json &book)
{
    if (!book.is_object()) throw std::invalid_argument("book must be an object");
    const auto asset = text(book.at("asset_id"));
    const auto best = validate_levels(book.at("asks"), true);
    validate_levels(book.at("bids"), false);
    return {asset, best};
}

std::vector<MarketAskUpdate> parse_updates(const std::string &message)
{
    if (message.empty() || message == "PONG") return {};
    const auto envelope = json::parse(message);
    if (!envelope.is_object()) throw std::invalid_argument("message must be an object");
    if (envelope.contains("topic") || envelope.contains("type"))
    {
        const auto topic = text(envelope.at("topic"));
        const auto type = text(envelope.at("type"));
        if (topic != "clob_market" || type != "agg_orderbook") return {};
    }
    else
    {
        text(envelope.at("connection_id"));
        if (!envelope.contains("payload")) return {};
    }
    const auto &payload = envelope.at("payload");
    std::vector<MarketAskUpdate> updates;
    if (payload.is_array())
    {
        updates.reserve(payload.size());
        for (const auto &book : payload) updates.push_back(parse_book(book));
    }
    else updates.push_back(parse_book(payload));
    return updates;
}
}

std::vector<MarketAskUpdate> parse_market_ask_updates(const std::string &message)
{
    try { return parse_updates(message); }
    catch (const json::exception &) {
        throw MarketStreamValidationError("invalid JSON or missing book field");
    }
    catch (const std::exception &error) {
        throw MarketStreamValidationError(error.what());
    }
}
}
