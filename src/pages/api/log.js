import { createLogger, transports } from "winston";

const logger = createLogger({
    transports: [new transports.Console()],
});

export default (req, res) => {
    const { body } = req;
    logger.info("Received request:", body);
    console.log("log request", body)
    res.status(200).json({ message: "Request logged successfully" });
};