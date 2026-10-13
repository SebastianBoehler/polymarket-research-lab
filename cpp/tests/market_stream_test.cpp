#include <market_stream.hpp>
#include <nlohmann/json.hpp>
#include <cstdlib>
#include <iostream>
#include <limits>

using json = nlohmann::json;

void require(bool condition, const char *message)
{
    if (!condition) { std::cerr << "FAIL: " << message << '\n'; std::exit(1); }
}

json book()
{
    return {{"asset_id", "yes"}, {"asks", json::array({{{"price", "0.5"}, {"size", "2"}}})},
            {"bids", json::array()}};
}

json envelope(const json &payload)
{
    return {{"topic", "clob_market"}, {"type", "agg_orderbook"}, {"payload", payload}};
}

void rejects(const json &value)
{
    bool rejected = false;
    try { polyarb::parse_market_ask_updates(value.dump()); }
    catch (const polyarb::MarketStreamValidationError &) { rejected = true; }
    require(rejected, "malformed payload must be rejected");
}

int main()
{
    for (const json &bad : {json("0.5bad"), json("nan"), json("inf"), json("1.1"),
                            json("0"), json("-1"), json(true), json(nullptr), json::object()})
    {
        auto value = book(); value["asks"][0]["price"] = bad;
        rejects(envelope(value));
    }
    for (const json &bad : {json("2bad"), json("inf"), json("0"), json("-1"), json(nullptr)})
    {
        auto value = book(); value["asks"][0]["size"] = bad;
        rejects(envelope(value));
    }
    for (const json &bad : {json(nullptr), json::object(), json("bad")})
    {
        auto value = book(); value["asks"] = bad; rejects(envelope(value));
        value = book(); value["bids"] = bad; rejects(envelope(value));
    }
    auto missing = book(); missing.erase("asset_id"); rejects(envelope(missing));
    auto empty_id = book(); empty_id["asset_id"] = " "; rejects(envelope(empty_id));
    rejects(envelope(json::array({book(), nullptr})));
    rejects(envelope(nullptr));
    rejects(nullptr);
    rejects({{"payload", book()}});
    rejects({{"topic", 1}, {"type", "agg_orderbook"}, {"payload", book()}});

    const auto single = polyarb::parse_market_ask_updates(envelope(book()).dump());
    require(single.size() == 1 && single[0].asset_id == "yes" && single[0].best_ask == 0.5,
            "valid single snapshot");
    auto second = book(); second["asset_id"] = "no"; second["asks"][0]["price"] = 0.4;
    const auto batch = polyarb::parse_market_ask_updates(
        json({{"connection_id", "connection"}, {"payload", json::array({book(), second})}}).dump());
    require(batch.size() == 2 && batch[1].best_ask == 0.4, "valid legacy array snapshot");
    auto empty = book(); empty["asks"] = json::array();
    const auto clear = polyarb::parse_market_ask_updates(envelope(empty).dump());
    require(clear.size() == 1 && clear[0].best_ask == 0, "empty asks clear stale price");
    auto other = envelope(nullptr); other["topic"] = "other";
    require(polyarb::parse_market_ask_updates(other.dump()).empty(), "unrelated stream ignored");
    for (const std::string &raw : {"{", "null", "[]"})
    {
        bool rejected = false;
        try { polyarb::parse_market_ask_updates(raw); }
        catch (const polyarb::MarketStreamValidationError &) { rejected = true; }
        require(rejected, "invalid raw JSON rejected");
    }
    require(polyarb::parse_market_ask_updates("PONG").empty(), "heartbeat ignored");
    std::cout << "market stream validation passed\n";
}
