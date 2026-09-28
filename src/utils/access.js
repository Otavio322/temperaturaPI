
const scopeFor = (user) => (user.role === 'cliente' ? { clients: user._id } : {});

module.exports = { scopeFor };
