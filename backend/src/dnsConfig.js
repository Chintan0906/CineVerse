const dns = require("dns");
const { Agent, setGlobalDispatcher } = require("undici");

// Configure public DNS servers (Google & Cloudflare)
// This resolves domains like api.themoviedb.org that are blocked by Indian ISP DNS (e.g., Jio, Airtel)
const resolver = new dns.Resolver();
resolver.setServers(["8.8.8.8", "1.1.1.1"]);

const dispatcher = new Agent({
  connect: {
    lookup: (hostname, options, callback) => {
      if (typeof options === "function") {
        callback = options;
        options = {};
      }

      resolver.resolve4(hostname, (err, addresses) => {
        if (err || !addresses || !addresses.length) {
          // Fall back to default system lookup if public DNS lookup fails
          return dns.lookup(hostname, options, callback);
        }

        if (options && options.all) {
          return callback(
            null,
            addresses.map((addr) => ({ address: addr, family: 4 }))
          );
        }

        callback(null, addresses[0], 4);
      });
    },
  },
});

setGlobalDispatcher(dispatcher);

module.exports = dispatcher;
