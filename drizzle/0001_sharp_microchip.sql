CREATE TABLE `executionLogs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`strategyId` int NOT NULL,
	`userId` int NOT NULL,
	`eventType` varchar(50) NOT NULL,
	`message` text NOT NULL,
	`metadata` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `executionLogs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `orders` (
	`id` int AUTO_INCREMENT NOT NULL,
	`strategyId` int NOT NULL,
	`userId` int NOT NULL,
	`instrument` varchar(50) NOT NULL,
	`orderType` enum('market','limit') NOT NULL,
	`action` enum('BUY','SELL') NOT NULL,
	`quantity` int NOT NULL,
	`price` decimal(15,2) NOT NULL,
	`status` enum('created','queued','executed','closed','cancelled') NOT NULL DEFAULT 'created',
	`filledQuantity` int NOT NULL DEFAULT 0,
	`filledPrice` decimal(15,2),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`executedAt` timestamp,
	`closedAt` timestamp,
	CONSTRAINT `orders_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `positions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`strategyId` int NOT NULL,
	`userId` int NOT NULL,
	`instrument` varchar(50) NOT NULL,
	`action` enum('BUY','SELL') NOT NULL,
	`quantity` int NOT NULL,
	`entryPrice` decimal(15,2) NOT NULL,
	`currentPrice` decimal(15,2) NOT NULL,
	`unrealizedPnl` decimal(15,2) NOT NULL DEFAULT '0',
	`realizedPnl` decimal(15,2) NOT NULL DEFAULT '0',
	`stoploss` decimal(15,2),
	`target` decimal(15,2),
	`trailingSlEnabled` boolean NOT NULL DEFAULT false,
	`trailingSlValue` decimal(15,2),
	`status` enum('open','closed') NOT NULL DEFAULT 'open',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`closedAt` timestamp,
	CONSTRAINT `positions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `riskConfigs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`maxDrawdownPercent` decimal(5,2) NOT NULL DEFAULT '10',
	`dailyLossLimit` decimal(15,2),
	`maxPositionSize` decimal(15,2),
	`maxOpenPositions` int NOT NULL DEFAULT 5,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `riskConfigs_id` PRIMARY KEY(`id`),
	CONSTRAINT `riskConfigs_userId_unique` UNIQUE(`userId`)
);
--> statement-breakpoint
CREATE TABLE `strategies` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`status` enum('created','ready','active','running','completed','stopped') NOT NULL DEFAULT 'created',
	`config` json NOT NULL,
	`initialCapital` decimal(15,2) NOT NULL,
	`currentCapital` decimal(15,2) NOT NULL,
	`realizedPnl` decimal(15,2) NOT NULL DEFAULT '0',
	`unrealizedPnl` decimal(15,2) NOT NULL DEFAULT '0',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`startedAt` timestamp,
	`completedAt` timestamp,
	CONSTRAINT `strategies_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `subscriptions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`plan` enum('free','paid') NOT NULL DEFAULT 'free',
	`maxActiveStrategies` int NOT NULL DEFAULT 2,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `subscriptions_id` PRIMARY KEY(`id`),
	CONSTRAINT `subscriptions_userId_unique` UNIQUE(`userId`)
);
--> statement-breakpoint
CREATE TABLE `trades` (
	`id` int AUTO_INCREMENT NOT NULL,
	`strategyId` int NOT NULL,
	`userId` int NOT NULL,
	`instrument` varchar(50) NOT NULL,
	`entryOrderId` int NOT NULL,
	`exitOrderId` int,
	`action` enum('BUY','SELL') NOT NULL,
	`quantity` int NOT NULL,
	`entryPrice` decimal(15,2) NOT NULL,
	`exitPrice` decimal(15,2),
	`pnl` decimal(15,2) NOT NULL DEFAULT '0',
	`pnlPercent` decimal(10,4) NOT NULL DEFAULT '0',
	`exitReason` enum('target','stoploss','manual','trailing_sl','mtm_limit'),
	`entryAt` timestamp NOT NULL,
	`exitAt` timestamp,
	CONSTRAINT `trades_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `executionLogs` ADD CONSTRAINT `executionLogs_strategyId_strategies_id_fk` FOREIGN KEY (`strategyId`) REFERENCES `strategies`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `executionLogs` ADD CONSTRAINT `executionLogs_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `orders` ADD CONSTRAINT `orders_strategyId_strategies_id_fk` FOREIGN KEY (`strategyId`) REFERENCES `strategies`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `orders` ADD CONSTRAINT `orders_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `positions` ADD CONSTRAINT `positions_strategyId_strategies_id_fk` FOREIGN KEY (`strategyId`) REFERENCES `strategies`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `positions` ADD CONSTRAINT `positions_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `riskConfigs` ADD CONSTRAINT `riskConfigs_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `strategies` ADD CONSTRAINT `strategies_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `subscriptions` ADD CONSTRAINT `subscriptions_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `trades` ADD CONSTRAINT `trades_strategyId_strategies_id_fk` FOREIGN KEY (`strategyId`) REFERENCES `strategies`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `trades` ADD CONSTRAINT `trades_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `trades` ADD CONSTRAINT `trades_entryOrderId_orders_id_fk` FOREIGN KEY (`entryOrderId`) REFERENCES `orders`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `idx_strategy_event` ON `executionLogs` (`strategyId`,`eventType`);--> statement-breakpoint
CREATE INDEX `idx_strategy_status` ON `orders` (`strategyId`,`status`);--> statement-breakpoint
CREATE INDEX `idx_strategy_status` ON `positions` (`strategyId`,`status`);--> statement-breakpoint
CREATE INDEX `idx_user_status` ON `strategies` (`userId`,`status`);--> statement-breakpoint
CREATE INDEX `idx_strategy_entry` ON `trades` (`strategyId`,`entryAt`);