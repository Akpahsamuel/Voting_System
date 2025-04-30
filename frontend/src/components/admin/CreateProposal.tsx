import { useState } from "react";
import { useSignAndExecuteTransaction } from "@mysten/dapp-kit";
import { Transaction } from "@mysten/sui/transactions";
import { useNetworkVariable } from "../../config/networkConfig";
import { SuiTransactionBlockResponse } from "@mysten/sui/client";
import { useAdminCap } from "../../hooks/useAdminCap";
import { useSuperAdminCap } from "../../hooks/useSuperAdminCap";
import { toast } from "sonner";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { format } from "date-fns";
import { CalendarIcon, Loader2 } from "lucide-react";
import { cn } from "../../lib/utils";

// Import shadcn components
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Textarea } from "../../components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "../../components/ui/form";
import { Calendar } from "../../components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "../../components/ui/popover";
import { Alert, AlertDescription } from "../../components/ui/alert";
import { Badge } from "../../components/ui/badge";

// Form schema validation
const formSchema = z.object({
  title: z.string().min(3, { message: "Title must be at least 3 characters" }).max(100, { message: "Title cannot exceed 100 characters" }),
  description: z.string().min(10, { message: "Description must be at least 10 characters" }),
  expiration: z.date({
    required_error: "Expiration date is required",
  }).refine((date) => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    return date >= tomorrow;
  }, {
    message: "Expiration date must be at least tomorrow",
  }),
});

const CreateProposal = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [isPrivate, setIsPrivate] = useState(false);
  
  const packageId = useNetworkVariable("packageId" as any);
  const dashboardId = useNetworkVariable("dashboardId" as any);
  const { adminCapId, hasAdminCap } = useAdminCap();
  const { superAdminCapId, hasSuperAdminCap } = useSuperAdminCap();
  const { mutate: signAndExecute } = useSignAndExecuteTransaction();
  
  // Initialize form with react-hook-form and zod validation
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      description: "",
    },
  });

  const handleSubmit = async (values: z.infer<typeof formSchema>, event?: React.BaseSyntheticEvent) => {
    // Prevent default form submission behavior
    if (event) {
      event.preventDefault();
    }
    // Check if user has either AdminCap or SuperAdminCap
    if (!hasAdminCap && !hasSuperAdminCap) {
      toast.error("You need admin or super admin capability to create proposals");
      return;
    }
    
    try {
      setIsLoading(true);
      
      // Calculate the expiration timestamp (in milliseconds)
      const expirationMs = values.expiration.getTime();
      
      // Create a new transaction block using the updated SDK
      const txb = new Transaction();

      // Determine which capability and methods to use
      const capId = hasAdminCap ? adminCapId! : superAdminCapId!;
      const createTarget = hasAdminCap 
        ? `${packageId}::proposal::create`
        : `${packageId}::proposal::create_super`;
      const registerTarget = hasAdminCap
        ? `${packageId}::dashboard::register_proposal`
        : `${packageId}::dashboard::register_proposal_super`;
      
      // Create proposal
      const [proposal] = txb.moveCall({
        target: createTarget,
        arguments: [
          txb.object(capId),
          txb.pure.string(values.title),
          txb.pure.string(values.description),
          txb.pure.u64(expirationMs),
          txb.pure.bool(isPrivate),
        ],
      });
      
      // Register proposal
      txb.moveCall({
        target: registerTarget,
        arguments: [
          txb.object(dashboardId),
          txb.object(capId),
          proposal,
          txb.pure.bool(isPrivate),
        ],
      });

      console.log("Transaction block built:", txb);
      
      // Use the signAndExecute function without await to prevent form submission from continuing
      signAndExecute({
        transaction: txb,
        options: {
          showEffects: true,
          showObjectChanges: true,
        },
        onSuccess: (result: SuiTransactionBlockResponse) => {
          console.log("Transaction success, digest:", result.digest);
          toast.success("Proposal created successfully!");
          form.reset();
          setIsPrivate(false);
          setIsLoading(false);
          
          // Add a small delay before allowing new submissions
          setTimeout(() => {
            setIsLoading(false);
          }, 1000);
        },
        onError: (error: Error) => {
          console.error("Transaction error:", error);
          toast.error(`Failed to create proposal: ${error.message}`);
          setIsLoading(false);
        },
      });
      
      // Return early to prevent form submission from continuing
      return false;
    } catch (error: any) {
      console.error("Creation error:", error);
      toast.error(`Error: ${error.message || "Unknown error occurred"}`);
      setIsLoading(false);
    }
  };
  
  // Check if we are in a valid state to create proposals
  const canCreateProposal = hasAdminCap || hasSuperAdminCap;

  // Cannot create proposals without at least one capability
  if (!canCreateProposal) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8">
        <Alert className="bg-red-100 text-red-800 border-red-300 dark:bg-red-900/30 dark:border-red-800 dark:text-red-300">
          <AlertDescription>
            You need admin or super admin capability to create proposals. Contact the system administrator to grant you access.
          </AlertDescription>
        </Alert>
      </div>
    );
  }
  
  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <Card className="border shadow-md bg-card">
        <CardHeader className="space-y-1">
          <div className="flex items-center justify-between">
            <CardTitle className="text-2xl font-bold tracking-tight">Create New Proposal</CardTitle>
            <div>
              {hasAdminCap && (
                <Badge className="bg-blue-600">Using AdminCap</Badge>
              )}
              {hasSuperAdminCap && (
                <Badge className="ml-2 bg-purple-600">SuperAdmin</Badge>
              )}
            </div>
          </div>
          <CardDescription>
            Fill out the form below to create a new governance proposal
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Proposal Title</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Enter a clear, concise title" 
                        {...field} 
                        className="w-full" 
                        disabled={isLoading}
                      />
                    </FormControl>
                    <FormDescription>
                      Keep your title descriptive but concise
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Describe the proposal in detail" 
                        {...field} 
                        className="min-h-32 resize-y" 
                        disabled={isLoading}
                      />
                    </FormControl>
                    <FormDescription>
                      Provide enough context for voters to make an informed decision
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="expiration"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Expiration Date</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                            disabled={isLoading}
                          >
                            {field.value ? (
                              format(field.value, "PPP")
                            ) : (
                              <span>Select expiration date</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) => {
                            const today = new Date();
                            today.setHours(0, 0, 0, 0);
                            const tomorrow = new Date(today);
                            tomorrow.setDate(tomorrow.getDate() + 1);
                            return date < tomorrow;
                          }}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormDescription>
                      The proposal will be active until this date
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="isPrivate"
                  checked={isPrivate}
                  onChange={e => setIsPrivate(e.target.checked)}
                  disabled={isLoading}
                />
                <label htmlFor="isPrivate" className="text-sm font-medium">
                  Private Proposal
                </label>
                <span className="text-xs text-muted-foreground">If checked, only registered voters can vote on this proposal.</span>
              </div>
              
              <div className="pt-4">
                <Button 
                  type="submit" 
                  className="w-full sm:w-auto ml-auto" 
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    "Create Proposal"
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
};

export default CreateProposal;
