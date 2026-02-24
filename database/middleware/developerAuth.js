module.exports = function (req, res, next) {
  const devKey = req.headers["x-dev-key"];

  if (!devKey || devKey !== process.env.DEV_SECRET) { 
    return res.status(403).json({
      message: "Access denied ❌ Developer only route"
    });
  }

  next();
};