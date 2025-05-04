import { useState } from "react";
import { useSignAndExecuteTransaction } from "@mysten/dapp-kit";
import { Transaction } from "@mysten/sui/transactions";
import { useNetworkVariable } from "../../config/networkConfig";
import { SuiTransactionBlockResponse } from "@mysten/sui/client";
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
import { Switch } from "../../components/ui/switch";

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
  })
});

interface CreateBallotProps {
  adminCapId: string | undefined;
  superAdminCapId: string | undefined;
  hasSuperAdminCap: boolean;
  onBallotCreated?: (ballotId: string) => void;
}

const CreateBallot = ({ adminCapId, superAdminCapId, hasSuperAdminCap, onBallotCreated }: CreateBallotProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isPrivate, setIsPrivate] = useState(false);
  
  const packageId = useNetworkVariable("packageId");
  const dashboardId = useNetworkVariable("dashboardId" as any);
  const { mutate: signAndExecute } = useSignAndExecuteTransaction();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      description: "",
      expiration: new Date()
    },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!adminCapId && !superAdminCapId) {
      toast.error("Admin capability not found");
      return;
    }

    setIsLoading(true);

    try {
      // Create a transaction that both creates the ballot and registers it in a single transaction
      const tx = new Transaction();
      
      // Determine which capability and methods to use
      const capId = hasSuperAdminCap && superAdminCapId ? superAdminCapId : adminCapId;
      const createTarget = hasSuperAdminCap && superAdminCapId
        ? `${packageId}::ballot::create_ballot_super`
        : `${packageId}::ballot::create_ballot`;
      const registerTarget = hasSuperAdminCap && superAdminCapId
        ? `${packageId}::dashboard::register_proposal_super`
        : `${packageId}::dashboard::register_proposal`;
      
      // Create ballot and capture its ID
      const [ballotId] = tx.moveCall({
        target: createTarget,
        arguments: [
          tx.object(capId!),
          tx.pure.string(values.title),
          tx.pure.string(values.description),
          tx.pure.u64(Math.floor(values.expiration.getTime() / 1000)), // Convert to Unix timestamp
          tx.pure.bool(isPrivate),
        ],
      });
      
      // Register ballot with dashboard in the same transaction
      tx.moveCall({
        target: registerTarget,
        arguments: [
          tx.object(dashboardId),
          tx.object(capId!),
          ballotId, // Use the result directly
          tx.pure.bool(isPrivate),
        ],
      });
      
      console.log("Transaction block built:", tx);

      // Execute the transaction
      signAndExecute(
        {
          transaction: tx.serialize(),
        },
        {
          onSuccess: (result) => {
            console.log("Ballot creation and registration success:", result);
            
            // Extract the ballot ID for callback purposes
            let extractedBallotId = null;
            
            try {
              // Use type assertions to safely handle the effects
              const resultObj = result as any; // Type assertion to avoid TypeScript errors
              
              // Check created objects first
              if (resultObj.effects?.created && Array.isArray(resultObj.effects.created)) {
                for (const created of resultObj.effects.created) {
                  if (created?.owner?.Shared && 
                      created?.reference?.objectId) {
                    extractedBallotId = created.reference.objectId;
                    console.log("Found ballot ID from created shared objects:", extractedBallotId);
                    break;
                  }
                }
              }
              
              // Other extraction methods...
              if (!extractedBallotId && resultObj.events && Array.isArray(resultObj.events)) {
                for (const event of resultObj.events) {
                  if (event?.type?.includes?.('::ballot::') && 
                      event?.parsedJson?.id) {
                    extractedBallotId = event.parsedJson.id;
                    break;
                  }
                }
              }
              
              // If still not found, try to parse the transaction digest (last resort)
              if (!extractedBallotId && resultObj.digest) {
                console.log("Could not extract ballot ID directly, but transaction was successful with digest:", resultObj.digest);
              }
            } catch (error) {
              console.error("Error parsing transaction result for ballot ID:", error);
            }
            
            toast.success("Ballot created and registered successfully");
            form.reset();
            
            // Call the callback with the new ballot ID if provided
            if (onBallotCreated && extractedBallotId) {
              onBallotCreated(extractedBallotId);
            }
            
            setIsLoading(false);
          },
          onError: (error) => {
            console.error("Ballot creation transaction failed:", error);
            toast.error("Failed to create ballot");
            setIsLoading(false);
          },
        }
      );
    } catch (error) {
      console.error("Error creating ballot:", error);
      toast.error("An error occurred while creating the ballot");
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create New Ballot</CardTitle>
        <CardDescription>
          Create a new ballot for users to vote on candidates
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ballot Title</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter ballot title" {...field} />
                  </FormControl>
                  <FormDescription>
                    A clear, concise title for your ballot
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
                      placeholder="Enter a detailed description of the ballot"
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Provide context and details about what users are voting on
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
                          variant={"outline"}
                          className={cn(
                            "w-full pl-3 text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          {field.value ? (
                            format(field.value, "PPP")
                          ) : (
                            <span>Pick a date</span>
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
                          const tomorrow = new Date();
                          tomorrow.setDate(tomorrow.getDate() + 1);
                          tomorrow.setHours(0, 0, 0, 0);
                          return date < tomorrow;
                        }}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormDescription>
                    The date when voting will end
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex items-center space-x-2">
              <Switch
                id="private-ballot"
                checked={isPrivate}
                onCheckedChange={setIsPrivate}
              />
              <label
                htmlFor="private-ballot"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Private Ballot (only registered voters can vote)
              </label>
            </div>

            <Alert className="mb-6">
              <AlertDescription>
                After creating the ballot, you'll be able to add candidates.
              </AlertDescription>
            </Alert>

            <Button type="submit" disabled={isLoading} className="w-full">
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating Ballot...
                </>
              ) : (
                "Create Ballot"
              )}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};

export default CreateBallot;
