import { Router } from 'express';
import { CreateAccountCommandHandler } from '../../application/commands/CreateAccountHandler';
import { DepositMoneyCommandHandler } from '../../application/commands/DepositMoneyHandler';
import { WithdrawMoneyCommandHandler } from '../../application/commands/WithdrawMoneyHandler';
import { CloseAccountCommandHandler } from '../../application/commands/CloseAccountHandler';
export declare function createCommandRouter(deps: {
    createAccountHandler: CreateAccountCommandHandler;
    depositMoneyHandler: DepositMoneyCommandHandler;
    withdrawMoneyHandler: WithdrawMoneyCommandHandler;
    closeAccountHandler: CloseAccountCommandHandler;
}): Router;
