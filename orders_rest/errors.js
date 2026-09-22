function problem(status, title, detail) {
  return {
    type: `https://campuseats.example/problems/${status}`,
    title,
    status,
    detail
  };
}

module.exports = { problem };
